import { FormEventHandler, useEffect, useState, VFC } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Box, Paper, useMediaQuery, useTheme } from '@mui/material';
import { PageContent } from 'component/common/PageContent/PageContent';
import { PageHeader } from 'component/common/PageHeader/PageHeader';
import useToast from 'hooks/useToast';
import { formatUnknownError } from 'utils/formatUnknownError';
import { ConditionallyRender } from 'component/common/ConditionallyRender/ConditionallyRender';
import { usePlaygroundApi } from 'hooks/api/actions/usePlayground/usePlayground';
import { useEnvironments } from 'hooks/api/getters/useEnvironments/useEnvironments';
import { PlaygroundForm } from './PlaygroundForm/PlaygroundForm';
import {
    resolveDefaultEnvironment,
    resolveEnvironments,
    resolveProjects,
    resolveResultsWidth,
} from './playground.utils';
import { PlaygroundGuidance } from './PlaygroundGuidance/PlaygroundGuidance';
import { PlaygroundGuidancePopper } from './PlaygroundGuidancePopper/PlaygroundGuidancePopper';
import Loader from '../../common/Loader/Loader';
import { AdvancedPlaygroundResultsTable } from './AdvancedPlaygroundResultsTable/AdvancedPlaygroundResultsTable';
import { AdvancedPlaygroundResponseSchema } from 'openapi';

export const AdvancedPlayground: VFC<{}> = () => {
    const { environments: availableEnvironments } = useEnvironments();
    const theme = useTheme();
    const matches = true;

    const [environments, setEnvironments] = useState<string[]>([]);
    const [projects, setProjects] = useState<string[]>([]);
    const [context, setContext] = useState<string>();
    const [results, setResults] = useState<
        AdvancedPlaygroundResponseSchema | undefined
    >();
    const { setToastData } = useToast();
    const [searchParams, setSearchParams] = useSearchParams();
    const { evaluateAdvancedPlayground, loading } = usePlaygroundApi();

    useEffect(() => {
        setEnvironments([resolveDefaultEnvironment(availableEnvironments)]);
    }, [availableEnvironments]);

    useEffect(() => {
        loadInitialValuesFromUrl();
    }, []);

    const loadInitialValuesFromUrl = () => {
        try {
            const environments = resolveEnvironmentsFromUrl();
            const projects = resolveProjectsFromUrl();
            const context = resolveContextFromUrl();
            const makePlaygroundRequest = async () => {
                if (environments && context) {
                    await evaluatePlaygroundContext(
                        environments || [],
                        projects || '*',
                        context
                    );
                }
            };

            makePlaygroundRequest();
        } catch (error) {
            setToastData({
                type: 'error',
                title: `Failed to parse URL parameters: ${formatUnknownError(
                    error
                )}`,
            });
        }
    };

    const resolveEnvironmentsFromUrl = (): string[] | null => {
        let environmentArray: string[] | null = null;
        const environmentsFromUrl = searchParams.get('environments');
        if (environmentsFromUrl) {
            environmentArray = environmentsFromUrl.split(',');
            setEnvironments(environmentArray);
        }
        return environmentArray;
    };
    const resolveProjectsFromUrl = (): string[] | null => {
        let projectsArray: string[] | null = null;
        let projectsFromUrl = searchParams.get('projects');
        if (projectsFromUrl) {
            projectsArray = projectsFromUrl.split(',');
            setProjects(projectsArray);
        }
        return projectsArray;
    };
    const resolveContextFromUrl = () => {
        let contextFromUrl = searchParams.get('context');
        if (contextFromUrl) {
            contextFromUrl = decodeURI(contextFromUrl);
            setContext(contextFromUrl);
        }
        return contextFromUrl;
    };

    const evaluatePlaygroundContext = async (
        environments: string[] | string,
        projects: string[] | string,
        context: string | undefined,
        action?: () => void
    ) => {
        try {
            const parsedContext = JSON.parse(context || '{}');
            const response = await evaluateAdvancedPlayground({
                environments: resolveEnvironments(environments),
                projects: resolveProjects(projects),
                context: {
                    appName: 'playground',
                    ...parsedContext,
                },
            });

            if (action && typeof action === 'function') {
                action();
            }
            setResults(response);
        } catch (error: unknown) {
            setToastData({
                type: 'error',
                title: `Error parsing context: ${formatUnknownError(error)}`,
            });
        }
    };

    const onSubmit: FormEventHandler<HTMLFormElement> = async event => {
        event.preventDefault();

        await evaluatePlaygroundContext(
            environments,
            projects,
            context,
            setURLParameters
        );
    };

    const setURLParameters = () => {
        searchParams.set('context', encodeURI(context || '')); // always set because of native validation
        if (
            Array.isArray(environments) &&
            environments.length > 0 &&
            !(environments.length === 1 && environments[0] === '*')
        ) {
            searchParams.set('environments', environments.join(','));
        } else {
            searchParams.delete('projects');
        }
        if (
            Array.isArray(projects) &&
            projects.length > 0 &&
            !(projects.length === 1 && projects[0] === '*')
        ) {
            searchParams.set('projects', projects.join(','));
        } else {
            searchParams.delete('projects');
        }
        setSearchParams(searchParams);
    };

    const formWidth = results && !matches ? '35%' : 'auto';
    const resultsWidth = resolveResultsWidth(matches, results);

    return (
        <PageContent
            header={
                <PageHeader
                    title="Unleash playground"
                    actions={<PlaygroundGuidancePopper />}
                />
            }
            disableLoading
            bodyClass={'no-padding'}
        >
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: !matches ? 'row' : 'column',
                }}
            >
                <Box
                    sx={{
                        background: theme.palette.background.elevation2,
                        borderBottomLeftRadius: theme.shape.borderRadiusMedium,
                    }}
                >
                    <Paper
                        elevation={0}
                        sx={{
                            px: 4,
                            py: 3,
                            mb: 4,
                            mt: 2,
                            background: theme.palette.background.elevation2,
                            transition: 'width 0.4s ease',
                            minWidth: matches ? 'auto' : '500px',
                            width: formWidth,
                            position: 'sticky',
                            top: 0,
                        }}
                    >
                        <PlaygroundForm
                            onSubmit={onSubmit}
                            context={context}
                            setContext={setContext}
                            availableEnvironments={availableEnvironments}
                            projects={projects}
                            environments={environments}
                            setProjects={setProjects}
                            setEnvironments={setEnvironments}
                        />
                    </Paper>
                </Box>
                <Box
                    sx={theme => ({
                        width: resultsWidth,
                        transition: 'width 0.4s ease',
                        padding: theme.spacing(4, 2),
                    })}
                >
                    <ConditionallyRender
                        condition={loading}
                        show={<Loader />}
                        elseShow={
                            <ConditionallyRender
                                condition={Boolean(results)}
                                show={
                                    <AdvancedPlaygroundResultsTable
                                        loading={loading}
                                        features={results?.features}
                                        input={results?.input}
                                    />
                                }
                                elseShow={<PlaygroundGuidance />}
                            />
                        }
                    />
                </Box>
            </Box>
        </PageContent>
    );
};

export default AdvancedPlayground;
